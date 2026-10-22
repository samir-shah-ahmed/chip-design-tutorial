module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst_n;
  wire [0:0] led;
  blink #(.LIMIT(4), .WIDTH(1)) dut(.clk(clk), .rst_n(rst_n), .led(led));
  initial begin
    rst_n = 0;
    repeat (2) @(posedge clk);
    rst_n = 1;
    repeat (5) @(posedge clk);
    #1;
    if (led === 1'b0) $display("PASS led toggled");
    else $display("FAIL led=%b", led);
    $finish;
  end
endmodule
