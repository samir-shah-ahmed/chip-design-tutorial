module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst_n, btn_n;
  wire pressed;
  debounce #(.STABLE(3)) dut(.clk(clk), .rst_n(rst_n), .btn_n(btn_n), .pressed(pressed));
  initial begin
    rst_n = 0; btn_n = 1;
    repeat (2) @(posedge clk);
    rst_n = 1;
    @(negedge clk); btn_n = 0;
    repeat (12) @(posedge clk);
    #1;
    if (pressed === 1'b1) $display("PASS pressed");
    else $display("FAIL pressed=%b", pressed);
    $finish;
  end
endmodule
