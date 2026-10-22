module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst_n;
  reg [3:0] duty;
  wire led;
  integer i;
  integer on_count;
  pwm dut(.clk(clk), .rst_n(rst_n), .duty(duty), .led(led));
  initial begin
    rst_n = 0; duty = 4'd4; on_count = 0;
    repeat (2) @(posedge clk);
    rst_n = 1;
    for (i = 0; i < 16; i = i + 1) begin
      @(posedge clk); #1;
      if (led === 1'b0) on_count = on_count + 1;
    end
    if (on_count == 4) $display("PASS on-cycles=%0d", on_count);
    else $display("FAIL on-cycles=%0d expect 4", on_count);
    $finish;
  end
endmodule
