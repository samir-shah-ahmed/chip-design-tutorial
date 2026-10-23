module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst_n;
  wire [5:0] led;
  blink #(.LIMIT(4), .WIDTH(6)) dut(.clk(clk), .rst_n(rst_n), .led(led));
  initial begin
    rst_n = 0;
    repeat (2) @(posedge clk);
    rst_n = 1;
    repeat (5) @(posedge clk);
    #1;
    if (led === 6'b000000) $display("PASS led toggled");
    else $display("FAIL led=%b", led);
    $finish;
  end
endmodule
